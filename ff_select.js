import './ff_select.css';

class FF_Select {
    
    constructor(el, options){
        this.el = this.assign_element(el);
        this.options = options;
        this.init();
    }

    init(){
        this.multiple = this.el.multiple;
        this.selected = this.multiple ? [] : null;
        this.no_results_html = null;
        this.state = 'close';

        this.set_default( 'type', 'dropdown' );
        this.set_default( 'search', false );
        
        this.container_init();
        this.selected_indicators_init();
        this.search_init();
        this.choices_init();
        this.events_init();

        this.placeholder_init();
    }

    container_init(){
        this.container = document.createElement('div');
        this.container.classList.add('ff_select');
        this.container.classList.add('type-'+ this.type);
        this.el.after(this.container);
        this.el.style.display = 'none';

        if( this.with_indicator_remove() ) {
            this.container.classList.add('with_remove');
        }

        this.dropdown_container = document.createElement('div');
        this.dropdown_container.classList.add('ff_select_dropdown');
        this.container.append(this.dropdown_container);
    }

    search_init(){

        if( !this.search ) return;
        this.container.classList.add('with_search');

        this.input_container = document.createElement('div');
        this.input_container.classList.add('ff_select_input');
        this.dropdown_container.append(this.input_container);

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.autocomplete = "off";
        this.input.spellcheck = "false";
        this.input.placeholder = this.set_option('search_placeholder', "Search keyword");
        this.input_container.append(this.input);
    }

    choices_init(){

        this.choices_container = document.createElement('div');
        this.choices_container.classList.add('ff_select_choices');
        this.dropdown_container.append(this.choices_container);

        // generate choices
        this.choices = this.generate_choices();
        
        this.choices.forEach(choice => {
            choice.el = document.createElement('div');
            choice.el.textContent = choice.text;
            this.choices_container.append(choice.el);
    
            choice.el.addEventListener('click', ()=>{
                this.select(choice);
            });

            // initial selected
            if( choice.selected ) {
                this.select(choice);
            }
        });

        this.open_position = this.get_open_position();
        this.container.dataset.open = this.open_position;
    }

    generate_choices(){
        let choices = [];

        if( typeof this.options.choices !== 'undefined' ) {
            // choices set in js

            if( this.array_is_sequential(this.options.choices) ) {
                // sequential / no keys
                for( let i = 0; i < this.options.choices.length; i++ ) {
                    choices.push({
                        text: this.options.choices[i],
                        value: this.options.choices[i],
                    });
                }
            }
            else {
                // associative
                choices = this.options.choices;
            }
        }
        else {
            // choices from select element
            for( let i = 0; i < this.el.options.length; i++ ) {
                let option = this.el.options[i];
                choices.push({
                    text: option.text,
                    value: option.value,
                    selected: option.attributes.selected,
                    dataset: option.dataset,
                });
            }
        }

        return choices;
    }

    set_option( option_key, default_value ){
        if( typeof this.options[option_key] === 'undefined' ) {
            return default_value;
        }
        return this.options[option_key];
    }

    assign_element(selector){
        if( typeof selector === 'string' ) {
            return document.querySelector(selector);
        }
        else if( typeof selector === 'object' ) {
            return selector;
        }
        return false;
    }

    get_open_position(){
        let el = this.dropdown_container;
        let el_pos_y = el.getBoundingClientRect().top + window.scrollY;
        let el_total_y = el_pos_y + el.clientHeight
        let total_page_height = document.body.clientHeight;
        if( el_total_y > total_page_height ) {
            return 'top';
        }

        return 'bottom';
    }

    open_top_with_search_styling(){
        if( typeof this.open_top_styling_applied !== 'undefined' && this.open_top_styling_applied ) return;
        if( !this.search ) return;
        if( this.open_position != 'top' ) return;
        this.open_top_styling_applied = true;
        this.dropdown_container.style.paddingBottom = this.input_container.offsetHeight + 'px';
    }

    events_init(){

        this.container.addEventListener('click', ()=>{
            this.open();
        });

        this.search_events();
        
    }

    search_events(){

        if( !this.search ) return;

        this.is_filtered = false;
        this.typing_timeout = null;
        this.typing_duration = this.set_option('typing_duration', 400);

        this.input.addEventListener('keydown', (e)=>{

            clearTimeout(this.typing_timeout);

            if( e.key == 'Escape' ) {
                this.close();
                return;
            }
            else if( e.key == 'Enter' ) {
                this.filter(e.target.value);
                return;
            }
            
            this.typing_timeout = setTimeout(()=>{
                this.filter(e.target.value);
            }, this.typing_duration);
        });
    }
    
    open(){
        if( this.state == 'open' || this.state == 'closing' ) return;
        
        this.state = 'open';
        this.container.classList.add('open');

        this.on_open_with_search();
        
        document.body.ff_select_current = this;
        document.body.addEventListener('click', this.outside_click_listener, true );

        this.open_top_with_search_styling();
    }

    close(){
        this.state = 'closing';
        this.container.classList.remove('open');
        
        setTimeout(()=>{
            this.state = 'close';
        }, 100);

        this.on_close_with_search();
        
        document.body.ff_select_current = null;
        document.body.removeEventListener('click', this.outside_click_listener, true );
    }

    select(choice){

        if( this.multiple ) {
            // multiple - add
            this.selected.push(choice);
        }
        else {
            // single - unselect previous
            if( this.selected )  {
                this.unselect(this.selected);
            }
            this.selected = choice;
        }

        choice.el.classList.add('selected');
        choice.el.style.pointerEvents = 'none';
        this.indicator_add(choice);
        
        this.on_change();

        this.close();
    }
    
    unselect(choice){

        if( this.multiple ) {
            // multiple - remove item
            this.remove_item(choice);
        }
        else {
            this.selected = null;
        }
        
        choice.el.classList.remove('selected');
        choice.el.style.pointerEvents = '';
        choice.indicator.remove();

        this.on_change();
    }

    on_change(){
        this.container.dataset.with_value = this.has_value() ? 'yes' : 'no';
    }
    
    on_close_with_search(){
        if( !this.search ) return;
        this.clear_input();
        this.clear_filter();
    }

    on_open_with_search(){
        if( !this.search ) return;
        this.input.focus();
    }

    outside_click_listener(e){
        let el = e.target.closest('.ff_select');
        if( !el ) {
            this.ff_select_current.close();
        } else {
            if( el != this.ff_select_current.container ) {
                // opening another dropdown, close previous
                this.ff_select_current.close();
            }
        }
    }

    clear_input(){
        this.input.value = '';
        this.input.blur();
    }

    filter(find_text){
        
        this.is_filtered = true;
        
        this.no_results_clear();

        find_text = find_text.toLowerCase();    

        let no_result = true;
        this.choices.forEach(choice=>{
            if( choice.text.toLowerCase().indexOf(find_text) !== -1 ) {
                no_result = false;
                choice.el.style.display = '';
            } else {    
                choice.el.style.display = 'none';
            }
        })

        if( no_result ) {
            this.no_results_show();
        }
    }

    clear_filter(){
        if( !this.is_filtered ) return;

        this.no_results_clear();

        this.choices.forEach(choice=>{
            choice.el.style.display = '';
        })

        this.is_filtered = false;
    }

    no_results_show(){
        if( this.no_results_html ) return;
        this.no_results_html = document.createElement('div');
        this.no_results_html.classList.add('no_results');
        this.no_results_html.textContent = this.set_option('no_results_text', 'No results found...');
        this.choices_container.append(this.no_results_html);
    }

    no_results_clear(){
        if( !this.no_results_html ) return;
        this.no_results_html.remove();
        this.no_results_html = null;
    }

    selected_indicators_init(){
        this.selected_indicators = document.createElement('div');
        this.selected_indicators.classList.add('selected_options');
        this.container.prepend(this.selected_indicators);
    }

    indicator_add(choice){
        let indicator = document.createElement('div');
        indicator.classList.add('indicator');
        indicator.textContent = choice.text;
        choice.indicator = indicator;
        this.selected_indicators.append(indicator);

        if( this.with_indicator_remove() ) {
            this.indicator_remove_button(choice);
        }
    }

    with_indicator_remove(){
        if( this.multiple ) {
            return true;
        }

        if( typeof this.options.unselect !== 'undefined' && this.options.unselect ) {   
            return true;
        }

        return false;
    }

    indicator_remove_button(choice){
        let remove_button = document.createElement('div');
        remove_button.classList.add('remove');
        remove_button.textContent = 'x';
        remove_button.addEventListener('click', (e)=>{
            e.stopPropagation();
            this.unselect(choice);
        });
        choice.indicator.append(remove_button);
    }

    array_is_sequential(arr){
        return !Object.keys(arr[0]).length;
    }

    get_value(){
        
        if( this.multiple ) {
            let values = [];
            this.selected.forEach(selected=>{
                values.push(selected.value);
            })
            return values;
        }
        else {
            // single
            return this.selected.value;
        }
    }

    remove_item(choice){

        let index_to_remove = null;
        for( let i = 0; i < this.selected.length; i++ ) {
            if( this.selected[i].value == choice.value ) {
                index_to_remove = i;
                break;
            }
        }

        if( index_to_remove != null ) {
            this.selected.splice(index_to_remove, 1);
        }
    }
    
    has_value(){
        if( typeof this.selected === 'object' ) {
            return this.selected.length;
        }
        else {
            return this.selected;
        }
    }

    placeholder_init(){
        this.placeholder_text = document.createElement('div');
        this.placeholder_text.classList.add('placeholder_text');
        this.placeholder_text.textContent = this.set_option('placeholder', "Select");
        this.selected_indicators.append(this.placeholder_text);
    }

    set_default(key, value){
        this[key] = typeof this.options[key] !== 'undefined' ? this.options[key] : value;
    }

}

export default FF_Select;